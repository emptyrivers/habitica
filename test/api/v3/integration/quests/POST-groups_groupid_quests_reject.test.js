import {
  createAndPopulateGroup,
  translate as t,
} from '../../../../helpers/api-v3-integration.helper';
import { v4 as generateUUID } from 'uuid';

describe('POST /groups/:groupId/quests/invite/:questKey', () => {
  let questingGroup;
  let member;
  const PET_QUEST = 'whale';
  let userQuestUpdate = {
    items: {
      quests: {},
    },
    'party.quest.RSVPNeeded': true,
    'party.quest.key': PET_QUEST,
  };

  before(async () => {
    let { group, members } = await createAndPopulateGroup({
      groupDetails: { type: 'party', privacy: 'private' },
      members: 1,
    });

    questingGroup = group;
    member = members[0];

    userQuestUpdate.items.quests[PET_QUEST] = 1;
  });

  context('failure conditions', () => {
    it('returns an error when group is not found', async () => {
      await expect(member.post(`/groups/${generateUUID()}/quests/reject/${PET_QUEST}`))
        .to.eventually.be.rejected.and.eql({
          code: 404,
          error: 'NotFound',
          message: t('groupNotFound'),
        });
    });

    it('returns an error when group is not a party', async () => {
      let { group, groupLeader } = await createAndPopulateGroup({
        groupDetails: { type: 'guild', privacy: 'private' },
      });

      await expect(groupLeader.post(`/groups/${group._id}/quests/reject/${PET_QUEST}`))
        .to.eventually.be.rejected.and.eql({
          code: 401,
          error: 'NotAuthorized',
          message: t('guildQuestsNotSupported'),
        });
    });

    it('returns an error when quest is not found', async () => {
      let questKey = 'fakeQuestName';

      await expect(member.post(`/groups/${questingGroup._id}/quests/reject/${questKey}`))
        .to.eventually.be.rejected.and.eql({
          code: 404,
          error: 'NotFound',
          message: t('questNotFound', { key: questKey }),
        });
    });

    it('returns an error when user is not on the quest', async () => {
      await expect(member.post(`/groups/${questingGroup._id}/quests/reject/${PET_QUEST}`))
        .to.eventually.be.rejected.and.eql({
          code: 401,
          error: 'NotAuthorized',
          message: t('questNotOwned'),
        });
    });

    it('returns an error when group is not on a quest', async () => {
      await member.update(userQuestUpdate);

      await expect(member.post(`/groups/${questingGroup._id}/quests/reject/${PET_QUEST}`))
        .to.eventually.be.rejected.and.eql({
          code: 404,
          error: 'NotFound',
          message: t('questInvitationDoesNotExist'),
        });
    });
  });

  context('successfully quest rejection', () => {
    it('rejects a quest invitation', async () => {
      await member.update(userQuestUpdate);
      await questingGroup.update({'quest.key': PET_QUEST});

      await member.post(`/groups/${questingGroup._id}/quests/reject/${PET_QUEST}`);

      let userWithRejectInvitation = await member.get('/user');
      expect(userWithRejectInvitation.party.quest.key).to.be.null;
      expect(userWithRejectInvitation.party.quest.RSVPNeeded).to.be.false;
    });
  });
});
